const pdf = require('pdf-parse');
console.log("PDFParse:", pdf.PDFParse);
console.log("typeof PDFParse:", typeof pdf.PDFParse);
try {
  const parser = new pdf.PDFParse(Buffer.from(""));
  console.log("Successfully created instance with Buffer");
} catch (e) {
  console.log("Failed with Buffer:", e.message);
}
try {
  const parser = new pdf.PDFParse({ data: Buffer.from("") });
  console.log("Successfully created instance with {data}");
} catch (e) {
  console.log("Failed with {data}:", e.message);
}
