const https = require('https');
https.get("https://raw.githubusercontent.com/duccodedao/phuonghiepthanh/refs/heads/main/index.html", res => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    require('fs').writeFileSync('tmp.html', data);
    console.log("Done");
  });
});
