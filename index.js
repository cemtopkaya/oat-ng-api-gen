const prompt = require("prompt");
const fs = require("fs");
const { exec } = require("child_process");

let yamlPath;
let packageName;
let outputPath;

const properties = [
  {
  name: 'yamlPath',
    type: "string",
  validator: /^(.+)[\/\\]([^/]+)$/,
  message: 'YAML Dosyasının yolunu giriniz',
  warning: 'Path must be only letters, spaces, or dashes',
    before: function (value) {
      yamlPath = value;
      return yamlPath;
    },
  required: true
  }
  ,
  {
    name: "packageName",
    type: "string",
    before: function (value) {
      packageName = "@cinar/" + value;
      return packageName;
    },
    message: '"@cinar/nrf-api" gibi bir çıktı için "@cinar/" sonrası paket adını giriniz',
    validator: /^[a-zA-Z\-]+$/,
    warning: "Harf, rakkam veya tire (-) kullanabilirsiniz",
    required: true,
  },
  {
    name: "outputPath",
    type: "string",
    //message: '"@cinar/nrf-api" gibi bir çıktı için "@cinar/" sonrası paket adını giriniz',
    message: `Çıktının oluşturulacağı dizin yolu (Örn: c:\\Temp)
    Boş bırakırsanız bulunduğunuz dizine paket adıyla yaratacak`,
    before: function (value) {

      outputPath = value || process.cwd();
      try {
        console.log("path: "+outputPath);
        if (fs.existsSync(outputPath)) {
          outputPath = outputPath+"/"+packageName;
          console.log("Dosya mevcut: "+outputPath);
          return outputPath;
        }
      } catch (err) {
        console.log("HATAAA");
        console.error(err);
      }
      return outputPath;
    },
    validator: /^.*$/,
  },
  // ,
  // {
  // name: 'username',
  // validator: /^[a-zA-Z\s\-]+$/,
  // warning: 'Username must be only letters, spaces, or dashes'
  // }
  // ,{
  // name: 'password',
  // hidden: true
  // }
];

prompt.start();

prompt.get(properties, function (err, result) {
  if (err) {
    return onErr(err);
  }
  console.log("Command-line input received:");
  // console.log('  Username: ' + result["YAML Dosya yolu"]);
  console.log("  Paket Adı: " + result["packageName"]);
  // console.log('  Password: ' + result.password);
  exec(`${__dirname}/node_modules/.bin/openapi-generator.cmd generate \
  -i ${yamlPath} \
  -g typescript-angular \
  -o ${outputPath} \
  --additional-properties npmName=${packageName},snapshot=true,ngVersion=8.2.14,modelPropertyNaming=original  
  `, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
  });
});

function onErr(err) {
  console.log(err);
  return 1;
}
