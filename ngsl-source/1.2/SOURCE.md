# ไฟล์ต้นฉบับ NGSL 1.2

> New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.

- **License:** https://creativecommons.org/licenses/by-sa/4.0/
- **ที่มา:** https://www.newgeneralservicelist.com/new-general-service-list (เว็บทางการแห่งเดียวของ NGSL)
- **เวอร์ชัน:** NGSL 1.2 (ออกเมื่อเมษายน 2023)
- **วันที่ดาวน์โหลด:** 2026-10-25 (เวลาไทย)

> ⚠️ **ห้ามแก้ไฟล์ในโฟลเดอร์นี้** CI ตรวจ SHA-256 ทุก PR ถ้า NGSL ออกเวอร์ชันใหม่ ให้แจ้ง 🚨 NGSL Alert ก่อน แล้วเก็บไว้ในโฟลเดอร์ใหม่ เช่น `ngsl-source/1.3/`

## ไฟล์

| ไฟล์ | ชื่อบนเว็บทางการ | ใช้ทำอะไร |
|---|---|---|
| `NGSL_12_stats.csv` | NGSL 1.2 with basic statistics | อันดับความถี่ (SFI Rank) ของ 2,809 คำ |
| `NGSL_12_lemmatized_for_teaching.csv` | NGSL 1.2 alphabetized and lemmatized for teaching | คำหลักและรูปคำ สำหรับทำ flashcard |
| `SUP_lemmatized.csv` | NGSL SUPPLEMENTARY WORDS | คำเสริม 52 คำ (วัน เดือน ตัวเลข) ซึ่งไม่มีอันดับ |
| `NGSL_12_alphabetized_description.txt` | NGSL 1.2 alphabetized with a brief explanation of corpus | คำอธิบาย corpus และรายการเปลี่ยนแปลงของ 1.2 |

ทุกไฟล์ดาวน์โหลดจาก `https://www.newgeneralservicelist.com/s/<ชื่อไฟล์>`

## SHA-256

```
2098bab8955a120a9766c6282a51d7d578c6cb0a7d946600d2ffb73ba25a0b44  NGSL_12_stats.csv
b54e297244988237457e04f823aa8dca68e3d646938dc76d383e099f04cb7666  NGSL_12_lemmatized_for_teaching.csv
7bb4c76cbe43ae87240be4ac7ada370b9e1a0d9d631d8c4430138646965d03f6  SUP_lemmatized.csv
8056a5252576ddc5a3c2e96b1422eb2bc7991bdc527ecb2e00181fadff51d9dc  NGSL_12_alphabetized_description.txt
```

ตรวจเองได้ด้วยคำสั่ง (รันในโฟลเดอร์นี้)

```sh
grep -E '^[0-9a-f]{64}  ' SOURCE.md | sha256sum -c
```

## ข้อสังเกต

- ไฟล์ stats สะกดคำหลักเป็น `I` แต่ไฟล์ teaching สะกด `i` ชุดข้อมูลของเราจะใช้ `I` ตามไฟล์ stats (ไม่ได้แก้ไฟล์ต้นฉบับ)
- ไฟล์ stats มี 2,809 คำ อันดับ 1–2,809 ครบและไม่ซ้ำ ไฟล์ teaching มีคำหลัก 2,809 คำตรงกัน (ต่างกันแค่ตัวพิมพ์ของ `I`) ส่วนไฟล์คำเสริมมี 52 คำที่ไม่ซ้ำกับ 2 ไฟล์แรก รวมเป็น 2,861 คำ
- คำพ้องรูป 5 คำที่หัวไฟล์ teaching ระบุ (FOUND, LEFT, MINE, ROSE, WOUND) ถูกแยกความหมายด้วยรูปคำ เช่น found ที่เป็นรูปอดีตของ find อยู่ในรูปคำของ `find` ส่วนคำหลัก `found` มีรูปคำ founds, founded, founding (ก่อตั้ง)
- หัวไฟล์ teaching ระบุว่าทำมาเพื่อการสอน เช่น ทำสื่อการสอนหรือ flashcard ตรงกับการใช้งานของโปรเจคนี้
- บางไฟล์ใช้ line ending แบบ CRLF และ `SUP_lemmatized.csv` มี UTF-8 BOM เราเก็บไว้ตามต้นฉบับ (`.gitattributes` สั่งไม่ให้ git แปลง)
