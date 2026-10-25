# Aaradhya Heights website

Static, single-page marketing site. No build step, no backend. Upload the folder as-is to any static host.

## Deploy

- Netlify / Vercel / Cloudflare Pages: drag the folder in (or `netlify deploy --prod --dir=.`). Then add the custom domain in the host dashboard and point your domain's DNS at it (A/ALIAS for the root, CNAME for `www`).
- cPanel / shared hosting: copy everything into `public_html/`.
- GitHub Pages: push the folder to a repo, enable Pages on the root.

Everything is self-hosted (fonts, GSAP, Lenis, images), so the site works with no third-party requests.

## Structure

```
index.html                 page markup (all sections)
assets/css/style.css       design system and layout
assets/css/fonts.css       self-hosted @font-face rules
assets/js/i18n.js          ALL text content, English + Telugu, plus flat data
assets/js/main.js          language gate, animations, floor-plan picker, form
assets/img/                optimized WebP images, logo favicon
assets/fonts/              woff2 fonts (Cormorant Garamond, Manrope, Jost, Noto Telugu)
assets/vendor/             gsap, ScrollTrigger, SplitText, lenis
assets/docs/               compressed brochure PDF (download link)
```

## Editing content

- Text in either language: edit `assets/js/i18n.js`. Every key exists in both `en` and `te`. Keys ending in `_html` may contain `<em>` for the gold accent word.
- Phone / WhatsApp number: search for `97052 77555` in `index.html` and `PHONE` in `main.js`.
- Floor plan data (areas, room sizes, hotspot positions): `AH_FLATS` at the bottom of `i18n.js`. `box` is the highlight rectangle in percent `[left, top, width, height]` of the plan image; `pin` is the hotspot centre.
- Map links: the Get Directions / Open in Google Maps links use the project's coordinates (16.5049377, 80.7127661).
- Language: visitors pick a language on first visit. The choice is remembered in localStorage. `?lang=te` or `?lang=en` in the URL forces a language (useful for ads and WhatsApp campaigns).

## Lead capture

The form has no backend. It opens WhatsApp with a prefilled message to +91 97052 77555. To add email or CRM capture later, post the form to Netlify Forms, Formspree, or your own endpoint in `initForm()` in `main.js`.

## Notes

- Brochure table lists plinth 1173 for all four flats; the floor plan shows Flat 3 as 1,195.70 and Flat 4 as 1,165.75 sq ft, which also matches the super built-up totals, so the site uses the floor plan values.
- Images are artistic impressions from the brochure. The disclaimer in the footer covers this.
