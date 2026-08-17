# Arena Strigoilor

Joc web inspirat de Gobblet Gobblers, cu piese tematice românești și un adversar AI.

- Site public: https://arena-strigoilor.vercel.app/
- Ruleset activ: `regula_strigoi_1`
- Branch de producție: `main`

## Regulile speciale `regula_strigoi_1`

- Fiecare jucător are 6 piese: 2 Strigoi, 2 Pricolici și 2 Moroi.
- Orice linie completă devine roșie și aproape câștigătoare, fără victorie instant.
- Adversarul are exact următoarea sa tură pentru a rupe linia.
- Apărătorul are exact următoarea sa tură pentru blocaj.
- Blocajul se face cu o piesă suficient de mare din rezervă sau mutată de pe tablă.
- Piesele proprii vizibile pot fi mutate pe un spațiu liber sau peste o piesă mai mică, inclusiv una proprie.
- O singură mutare trebuie să blocheze toate amenințările care expiră în aceeași tură.
- Amenințările existente se rezolvă înainte de scanarea liniilor noi.

Regulile complete pentru jucători sunt afișate direct în `index.html`.

## Fișiere principale

- `assets/regula-strigoi-1.js` — motorul pur al regulilor, starea și evaluarea AI.
- `assets/apple.js` — interfața jocului și integrarea cu motorul.
- `assets/regula-strigoi-1.css` — indicatorii pentru liniile vulnerabile și apărare.
- `index.html` — pagina canonică publică și regulile afișate.
- `rulesets/regula_strigoi_1.json` — manifestul de rollback.

## Verificare

Cu Node.js disponibil, rulează:

```powershell
node tests/regula_strigoi_1.test.js
node tests/project-integrity.test.js
```

Primul fișier verifică regulile și deciziile AI. Al doilea verifică diacriticele UTF-8, legăturile dintre resurse, pagina canonică, regulile scrise și integritatea snapshot-urilor.

## Rollback

Starea anterioară rulesetului este păstrată în `snapshots/pre-regula_strigoi_1/`. Instrucțiunile și SHA-ul de bază sunt în `rulesets/regula_strigoi_1.json`.

Declanșatorul convenit este:

> revino la regulile jocului de dinainte de regula_strigoi_1

La rollback se restaurează fișierele din snapshot, se elimină fișierele specifice rulesetului enumerate în manifest și se rulează din nou verificările potrivite stării restaurate.
