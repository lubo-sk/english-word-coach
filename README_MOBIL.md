# English Word Coach - mobilna instalacia

## 1) Publikovanie cez GitHub Pages

1. Vytvor na GitHub novy repository (napr. `english-word-coach`).
2. V priecinku `C:\Anglictina` otvor terminal a spusti:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial version"
git remote add origin https://github.com/TVOJ-UCET/english-word-coach.git
git push -u origin main
```

3. Na GitHub: `Settings -> Pages`.
4. V casti `Build and deployment` nastav:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` + `/ (root)`
5. Uloz. Za 1-3 minuty bude web dostupny na adrese:
   - `https://TVOJ-UCET.github.io/english-word-coach/`

## 2) Instalacia do mobilu

### Android (Chrome)
1. Otvor publikovanu URL.
2. V menu Chrome vyber `Install app` alebo `Add to Home screen`.
3. Potvrd instalaciu.

### iPhone (Safari)
1. Otvor publikovanu URL.
2. Klikni `Share`.
3. Vyber `Add to Home Screen`.
4. Potvrd pridanie.

## Poznamka
- Aplikacia sa vie spustit aj ako samostatna web-app (PWA).
- Preklady a synonyma pre vacsinu slov potrebuju internet (online API).
