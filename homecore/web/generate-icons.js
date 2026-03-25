import sharp from "sharp";

await sharp("public/icon.svg").resize(192).png().toFile("public/icon-192.png");
await sharp("public/icon.svg").resize(512).png().toFile("public/icon-512.png");

console.log("Icons generated: icon-192.png, icon-512.png");
