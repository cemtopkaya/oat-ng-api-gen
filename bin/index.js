#!/usr/bin/env node

const prompt = require("prompt");
const fs = require("fs");
const fsx = require("fs-extra");
const path = require("path");
const { exec, execSync } = require("child_process");

// const out = process.cwd(); //execSync('cd')
// var lib  = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');

//   console.log(`process.cwd(): ${process.cwd()}`);
//   console.log(`__filename : ${__filename}`);
//   console.log(`__dirname : ${__dirname}`);
//   console.log(`lib : ${lib}`);

let yamlPath; 
let packageName;
let outputPath;
let angularProjectPath;
let angularCoreVersion;

const properties = [
  {
    name: "yamlPath",
    type: "string",
    validator: /^(.+)[\/\\]([^/]+)$/,
    message: "YAML Dosyasının yolunu giriniz",
    warning: "Path must be only letters, spaces, or dashes",
    before: function (value) {
      yamlPath = value;
      return yamlPath;
    },
    required: true,
  },
  {
    name: "packageName",
    type: "string",
    before: function (value) {
      packageName = "@cinar/" + value;
      return packageName;
    },
    message:
      '"@cinar/nrf-api" gibi bir çıktı için "@cinar/" sonrası paket adını giriniz',
    validator: /^[a-zA-Z\-]+$/,
    warning: "Harf, rakkam veya tire (-) kullanabilirsiniz",
    required: true,
  },
  {
    name: "angularProjectPath",
    type: "string",
    message: `Angular proje dizinini giriniz`,
    description: `Angular proje dizinini giriniz`,
    required: true,
    conform: function (value) {
      angularProjectPath = value;
      let angularJsonPath = path.join(angularProjectPath, "angular.json");
      let angularPackageJsonPath = path.join(
        angularProjectPath,
        "package.json"
      );

      const isAngularJsonExists = fs.existsSync(angularJsonPath);
      const isPackageJsonExists = fs.existsSync(angularPackageJsonPath);
      let isExists = isAngularJsonExists && isPackageJsonExists;

      if (isExists) {
        angularCoreVersion = require(angularPackageJsonPath).dependencies[
          "@angular/core"
        ];
        angularCoreVersion = (angularCoreVersion || "8.2.14")
          .replace("~", "")
          .replace("^", "");
      }

      return isExists;
    },
  },
];

prompt.start();

prompt.get(properties, function (err, result) {
  if (err) {
    return onErr(err);
  }
  console.log("\nCommand-line input received:");
  console.log(`\tYAML Dosya: ${result.yamlPath}`);
  console.log(`\tPaket Adı: ${result.packageName}`);
  console.log(`\tProje Dizini: ${result.angularProjectPath}`);
  

  const openApiDest = path.join(angularProjectPath,`/projects/${packageName.replace("@","")}/src/lib`);

  try {
    genAngularLibrary(packageName,angularProjectPath);
    delLibraryFiles(openApiDest);
  } catch (e) {
    console.log("İstisna: ", e);
    throw e;
  }
  
  try {
    genApiFromYaml(yamlPath, openApiDest, packageName, angularCoreVersion);
    delUnneccessaryFoldersFiles(openApiDest);
    movePackageJsons(openApiDest);
    changePublicApi(path.join(openApiDest, "../", "public-api.ts"));    
  } catch (e) {
    console.log("İstisna: ", e);
    throw e;    
  }

  console.log("----------------------------- anneeee..! bitti -----------------");
});

function genApiFromYaml(yamlPath, openApiDest, packageName, angularCoreVersion){
  
  const binPath = execSync("npm bin")
  console.log(`\tbinPath--binPath: ${binPath}\n`);

const pathOpenApiGen = path.join(__dirname, 'node_modules', '.bin', 'openapi-generator.cmd');
  console.log(`\tGen Dir: ${pathOpenApiGen}\n`);
  const cmdGenApi = `${pathOpenApiGen} generate \
  -i ${yamlPath} \
  -g typescript-angular \
  -o ${openApiDest} \
  --additional-properties npmName=${packageName},npmVersion=0.0.1,ngVersion=${angularCoreVersion},modelPropertyNaming=original,snapshot=false  
  `;

  console.log(cmdGenApi);

  execSync(
    cmdGenApi,
    //{ cwd: `${angularProjectPath}/projects/${packageName}/src/lib` },
    (error, stdout, stderr) => {
      if (error) {
        console.log(`******** error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`******** stderr: ${stderr}`);
        return;
      }
      console.log(`******** stdout: ${stdout}`);
    }
  );
}

function genAngularLibrary(packageName, angularProjectPath){
  execSync(
    `ng g library ${packageName}`,
    { cwd: angularProjectPath },
    (error, stdout, stderr) => {
      if (error) {
        console.log(`******** error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`******** stderr: ${stderr}`);
        return;
      }
      console.log(`******** stdout: ${stdout}`);
    }
  );
}

function delLibraryFiles(openApiDest) {
  const file = path.join(openApiDest, "../", "lib");
  console.log("file: ", file);
  fsx.removeSync(file);
  fsx.ensureDirSync(file);
}

function changePublicApi(filePath) {
  fs.readFile(filePath, "utf8", function (err, data) {
    if (err) {
      return console.log(err);
    }

    fs.writeFile(filePath, "export * from './lib/index';", function (err) {
      if (err) {
        return console.log(err);
      }
    });
  });
}

function movePackageJsons(openApiDest) {
  ["ng-package.json", "package.json"].forEach((file) => {
    const src = path.join(openApiDest, file);
    const dest = path.join(openApiDest, "../../", file);
    console.log("-- copySync -> ", src, " --> ", dest);
    const options = { overwrite: true };
    fsx.move(src, dest, options);
  });
}

function delUnneccessaryFoldersFiles(openApiDest) {
  [
    `${path.join(openApiDest, ".openapi-generator")}`,
    `${path.join(openApiDest, ".openapi-generator-ignore")}`,
    `${path.join(openApiDest, "tsconfig.json")}`,
    `${path.join(openApiDest, "README.md")}`,
    `${path.join(openApiDest, ".gitignore")}`,
    `${path.join(openApiDest, "git_push.sh")}`,
  ].forEach((file) => {
    console.log("-- removeSync -> ", file);
    fsx.removeSync(file);
  });
}

function onErr(err) {
  // console.log("----------------------------- Error: ", err);
  if(err.toString().indexOf('canceled')==-1){
    console.error(err);
    return 1;
  }
  return -1;
}
