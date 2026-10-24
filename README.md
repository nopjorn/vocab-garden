# 🌱 Vocab Garden

แอปท่องศัพท์ภาษาอังกฤษพื้นฐานสำหรับคนไทย ใช้คำศัพท์จาก **New General Service List (NGSL) 1.2** ใช้ฟรี เปิดได้ทั้งบนเว็บและบนมือถือแบบ Add to Home Screen

**👉 เปิดใช้งาน: https://nopjorn.github.io/vocab-garden/**

> 🚧 อยู่ระหว่างพัฒนา ตอนนี้แปลแล้ว 200 คำแรก ดูแผนงานและความคืบหน้าได้ที่ [TODO.md](TODO.md)

**ติดตั้งบนมือถือ**
- iPhone / iPad: เปิดใน Safari → กดปุ่มแชร์ → **Add to Home Screen** (เพิ่มไปยังหน้าจอโฮม)
- Android: เปิดใน Chrome → เมนู ⋮ → **Install app** (ติดตั้งแอป)

หลังเปิดครั้งแรก ใช้งานแบบ offline ได้

## ไอเดีย

คำศัพท์แต่ละคำเหมือนเมล็ดพันธุ์ ยิ่งทวนจนจำได้ คำนั้นก็ยิ่งโต

🌰 เมล็ด → 🌱 ต้นอ่อน → 🌿 กำลังโต → 🌳 ต้นไม้ใหญ่

- Flashcard พร้อมระบบทวนตามช่วงเวลา (spaced repetition)
- คำแปลภาษาไทย ชนิดคำ และประโยคตัวอย่าง
- ไม่ต้องสมัครสมาชิก ความคืบหน้าเก็บไว้ในเครื่องของผู้ใช้
- ติดตั้งบนมือถือได้ (PWA) และใช้แบบ offline ได้

## เครดิตคำศัพท์: NGSL

> New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.

- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **ที่มา:** https://www.newgeneralservicelist.com/new-general-service-list (เว็บทางการแห่งเดียวของ NGSL)
- **เวอร์ชันที่ใช้:** NGSL 1.2
- **ไฟล์ต้นฉบับ:** เก็บไว้แบบไม่แก้ไขที่ [`ngsl-source/1.2/`](ngsl-source/1.2/SOURCE.md)
- **การอ้างอิง** (รูปแบบ APA ตามที่ทีม NGSL แนะนำ): Browne, C., Culligan, B. (2013). *The New General Service List*. Retrieved from https://www.newgeneralservicelist.com

สิ่งที่เราเปลี่ยนหรือเพิ่มจาก NGSL ทั้งหมดจะบันทึกไว้ใน [CHANGELOG.md](CHANGELOG.md) หมวด "ข้อมูลคำศัพท์"

**Vocab Garden ไม่ใช่แอปทางการของ NGSL และไม่ได้รับการรับรองจากผู้จัดทำ NGSL**

## License

| ส่วน | License |
|---|---|
| โค้ดของแอป | MIT (ดู [LICENSE](LICENSE)) |
| ไฟล์ต้นฉบับ NGSL ใน `ngsl-source/` | CC BY-SA 4.0 โดยผู้จัดทำ NGSL |
| ชุดข้อมูลคำศัพท์ที่ดัดแปลงจาก NGSL ใน `app/data/` (คำแปลไทย ประโยคตัวอย่าง ฯลฯ) | CC BY-SA 4.0 (ดู [app/data/LICENSE](app/data/LICENSE)) |

## การพัฒนา

กติกาของโปรเจคอยู่ใน [CLAUDE.md](CLAUDE.md) โดยสรุป:

1. ยึดเงื่อนไขของ NGSL เป็นอันดับแรกเสมอ
2. ทุก PR ที่เข้า `main` ต้องขยับเลข version ใน `app/version.js` และเขียน `CHANGELOG.md`
3. ทุกการเปลี่ยนแปลงต้องผ่าน PR และผ่าน CI ก่อน merge

ลองเปิดแอปในเครื่อง: `python3 -m http.server -d app` แล้วเข้า http://localhost:8000

ตรวจในเครื่องก่อนเปิด PR:

```sh
python3 scripts/versioning.py check --base-ref origin/main
python3 scripts/check_ngsl.py
python3 scripts/validate_data.py
python3 -m unittest discover -s tests
node --test tests/js/*.test.mjs
```
