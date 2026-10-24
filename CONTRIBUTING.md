# ร่วมพัฒนา Vocab Garden 🌱

ขอบคุณที่สนใจช่วยโปรเจคนี้ค่ะ แอปท่องศัพท์ภาษาอังกฤษพื้นฐานจาก NGSL 1.2 สำหรับคนไทย ใช้ฟรี และทุกคนช่วยกันทำให้ดีขึ้นได้

## ช่วยได้อย่างไรบ้าง

| อยากทำอะไร | ทำอย่างไร |
|---|---|
| **แจ้งคำแปลผิด** | กดปุ่ม 🚩 "แจ้งคำแปลผิด" ที่ด้านหลังการ์ดในแอป จะเปิดฟอร์มที่กรอกข้อมูลคำไว้ให้ หรือสร้าง [Issue ใหม่](../../issues/new/choose) เลือก "แจ้งคำแปลผิด" |
| **แจ้งบั๊ก** | สร้าง [Issue ใหม่](../../issues/new/choose) เลือก "แจ้งบั๊ก" |
| **เสนอฟีเจอร์** | สร้าง [Issue ใหม่](../../issues/new/choose) เลือก "เสนอฟีเจอร์" |
| **แก้คำแปลเอง** | เปิด Pull Request แก้ไฟล์ใน `app/data/levels/` ตามหัวข้อด้านล่าง |
| **แก้โค้ด** | เปิด Pull Request ตามหัวข้อ "ก่อนเปิด Pull Request" |

## แก้คำแปล

ชุดข้อมูลอยู่ที่ [`app/data/levels/`](app/data/levels/) ด่านละ 1 ไฟล์ (`01.tsv`, `02.tsv`, …) เปิดดูบน GitHub จะแสดงเป็นตาราง

- อ่าน [คู่มือการแปล](docs/translation-guide.md) ก่อน ซึ่งบอกรูปแบบของ `meanings`, ชนิดคำ และประโยคตัวอย่าง
- แก้ได้เฉพาะคอลัมน์ภาษาไทย (`meanings`, `example_en`, `example_th`, `note`) **ห้ามแก้ `rank`, `headword`, `forms`** เพราะเป็นข้อมูลของ NGSL ถ้าคิดว่ารายการของ NGSL ผิด ให้แจ้งใน Issue แล้วเราจะส่งต่อให้ทีม NGSL
- ประโยคตัวอย่างต้องแต่งเอง ห้ามคัดลอกจากพจนานุกรม เว็บไซต์ หรือแอปอื่น และห้ามนำคำแปลจากแหล่งที่ไม่ได้ให้ license ที่เข้ากันได้มาใช้ ถ้าไม่แน่ใจ ถามใน Issue ก่อนได้เลย
- ทุกการเปลี่ยนแปลงต้องผ่านการตรวจอัตโนมัติ: `python3 scripts/validate_data.py` และ `python3 scripts/check_ngsl.py`

## ก่อนเปิด Pull Request

กติกาทั้งหมดอยู่ใน [CLAUDE.md](CLAUDE.md) โดยสรุป

1. ทำงานบน branch แยก ไม่ push ตรงเข้า `main`
2. ขยับเลขใน `app/version.js` ทีละขั้น และแก้บรรทัด `// sw-version:` ใน `app/sw.js` ให้ตรงกัน
3. เพิ่มหัวข้อเวอร์ชันนั้นบนสุดของ `CHANGELOG.md` เป็นภาษาไทย (หมวด: เพิ่ม / เปลี่ยนแปลง / แก้ไข / ลบ / ข้อมูลคำศัพท์)
4. กรอก checklist ใน PR template ให้ครบ

ตรวจในเครื่องก่อน push ทุกครั้ง

```sh
python3 scripts/versioning.py check --base-ref origin/main
python3 scripts/check_ngsl.py
python3 scripts/validate_data.py
python3 -m unittest discover -s tests
node --test tests/js/*.test.mjs
```

แอปเขียนด้วย HTML/CSS/JavaScript ล้วน ไม่มี framework และไม่มี dependency ภายนอก สคริปต์ใน `scripts/` ใช้ Python standard library เท่านั้น

## เรื่อง license ของงานที่ส่งเข้ามา

เมื่อคุณส่งงานเข้ามา (Issue, Pull Request หรือข้อเสนอแนะ) ถือว่าคุณยินยอมให้งานนั้นอยู่ภายใต้ license เดียวกับส่วนที่แก้

| ส่วนที่แก้ | License |
|---|---|
| ชุดข้อมูลคำศัพท์ใน `app/data/` และเอกสารคำแปล | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| โค้ดของแอปและสคริปต์ | [MIT](LICENSE) |

ชุดข้อมูลดัดแปลงมาจาก NGSL จึงต้องเผยแพร่ต่อเป็น CC BY-SA 4.0 ตามเงื่อนไขของผู้จัดทำ ห้ามเพิ่มเงื่อนไขที่จำกัดสิทธิ์ผู้อื่น (เช่น ห้ามคัดลอก หรือเข้ารหัสข้อมูล) และห้ามทำให้ดูเหมือนเป็นแอปทางการของ NGSL

ข้อความเครดิตทางการของ NGSL (ใช้ตามนี้ทุกตัวอักษร)

> New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.

ที่มา: https://www.newgeneralservicelist.com (เว็บทางการแห่งเดียวของ NGSL)
