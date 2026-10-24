# ร่างอีเมลแนะนำโปรเจคถึงทีม NGSL

ไฟล์นี้เป็นร่างที่ลิซ่าเขียนไว้ให้เจ้าของโปรเจคตรวจและส่งเอง **ลิซ่าไม่ได้ส่งอะไรออกไปทั้งสิ้น**

## ก่อนส่ง

- 👤 หาช่องทางติดต่อล่าสุดของทีม NGSL จากเว็บทางการ https://www.newgeneralservicelist.com (ลิซ่าไม่ได้ใส่ที่อยู่อีเมลให้เพราะไม่อยากเดา ให้ใช้ช่องทางที่เว็บนั้นระบุเท่านั้น) ถ้าใช้แบบฟอร์มติดต่อบนเว็บ ก็คัดลอกเนื้อหาด้านล่างไปวางได้
- 👤 ตรวจว่าตัวเลขและลิงก์ในร่างยังเป็นปัจจุบัน (จำนวนคำที่แปลแล้ว เวอร์ชันของแอป)
- 👤 ถ้าจะแก้ข้อความ ให้คงบรรทัดเครดิตกับข้อมูล license ไว้ตามเดิม
- ข้อความด้านล่างเขียนเป็นภาษาอังกฤษเพราะผู้รับเป็นทีมนานาชาติ

## ร่าง (English)

**Subject:** Vocab Garden, a free Thai flashcard app built on NGSL 1.2

Dear Dr. Browne and the NGSL team,

My name is [ชื่อเจ้าของโปรเจค]. I am building **Vocab Garden**, a free web app (also installable on phones) that helps Thai learners memorise basic English vocabulary with flashcards and spaced repetition. It uses the New General Service List 1.2 as its word list, and I would like to introduce it to you and make sure that I am using the list properly.

- App: https://nopjorn.github.io/vocab-garden/
- Source code and data: https://github.com/nopjorn/vocab-garden

**How the NGSL is used**

- The flashcards are based on `NGSL_12_lemmatized_for_teaching.csv` (headwords and word forms), and the frequency ranks come from `NGSL_12_stats.csv`, which is how I understand the files are meant to be used. The supplementary list is included as a separate level.
- The original files are kept unmodified in the repository, with SHA-256 checksums that our automated checks verify on every change.
- The words are grouped into levels of 100 by frequency rank. For each card we add Thai meanings, a part of speech, an original example sentence with its Thai translation, and a short usage note. Every change we make is recorded in a public changelog.
- The Thai translations and example sentences are drafted by an AI assistant and reviewed by me. The example sentences are written from scratch, not copied from any dictionary or other app. At the moment [200] of the 2,861 cards are translated, and the rest will follow gradually.
- The resulting data set is published under **CC BY-SA 4.0**. The code is MIT licensed. Both are free to reuse, and there is no registration, tracking or advertising in the app.
- The app shows the official attribution text, the version of the list (NGSL 1.2), a link to the license and to https://www.newgeneralservicelist.com, and states clearly that it is **not** an official NGSL product and is not endorsed by the authors.

**Two small questions**

1. Is there anything in how we credit, group or present the list that you would like us to change?
2. I may open a voluntary donation link so that the project can keep running. The app and the data will remain free, and nothing is sold. Please tell me if you have any concerns about this.

**Observations while preparing the data** (in case they are useful)

- The headword for the pronoun is spelled `I` in `NGSL_12_stats.csv` but `i` in `NGSL_12_lemmatized_for_teaching.csv`. We follow the stats file and have not altered either file.
- The five homograph entries mentioned in the header of the teaching file (FOUND, LEFT, MINE, ROSE, WOUND) are separated through their word forms. We handled each pair accordingly and added a note on the card that points to the other meaning.

Thank you very much for creating the NGSL and sharing it under an open license. It makes a free tool like this possible. I would be glad to hear any feedback.

Kind regards,
[ชื่อเจ้าของโปรเจค]
[ช่องทางติดต่อ]
