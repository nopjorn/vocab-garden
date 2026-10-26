# ฟอนต์ในแอป

**Anuphan** โดย Cadson Demak · Copyright 2019 The Anuphan Project Authors · ใช้ภายใต้ [SIL Open Font License 1.1](OFL.txt)
ต้นทาง: <https://github.com/cadsondemak/Anuphan> (ไฟล์จาก <https://github.com/google/fonts/tree/main/ofl/anuphan>)

ฟอนต์นี้เป็นของตกแต่งหน้าตาแอปเท่านั้น ไม่เกี่ยวกับข้อมูลคำศัพท์ของ NGSL และไม่ใช่ส่วนหนึ่งของชุดข้อมูล CC BY-SA 4.0

## สิ่งที่เราเปลี่ยน

`anuphan-thai-latin.woff2` ตัดมาจากไฟล์ `Anuphan[wght].ttf` ของต้นทางให้เล็กลง (ไม่ได้แก้รูปตัวอักษร):

- จำกัดแกนน้ำหนักเหลือ 400–700
- เก็บเฉพาะอักษรไทย อักษรละตินพื้นฐาน เครื่องหมายวรรคตอน และสัญลักษณ์ที่แอปใช้ (ตัวอื่นเบราว์เซอร์จะใช้ฟอนต์ของเครื่องแทน)
- เก็บ layout feature ทั้งหมด (วรรณยุกต์และสระลอยของภาษาไทยจึงวางถูกตำแหน่ง)
- บีบอัดเป็น WOFF2 (ข้อความลิขสิทธิ์ในไฟล์ยังอยู่ครบ)

คำสั่งที่ใช้ (ต้องมี `fonttools` และ `brotli` ใช้ครั้งเดียวตอนสร้างไฟล์ ไม่ใช่ส่วนของ CI):

```sh
fonttools varLib.instancer "Anuphan[wght].ttf" wght=400:700 -o Anuphan-400-700.ttf
pyftsubset Anuphan-400-700.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0E01-0E3A,U+0E3F-0E5B,U+2010-2027,U+2030-203A,U+20AC,U+2190-2193,U+2212,U+00D7,U+2022,U+2026" \
  --layout-features='*' --flavor=woff2 --output-file=anuphan-thai-latin.woff2
```
