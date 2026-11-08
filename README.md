# Vancouver · a cartoon map of sights & food

A mobile-friendly, English / 中文 tourism site for Vancouver and the places people road-trip to from it:
the Sea-to-Sky Highway and Gondola up to Whistler, Victoria and Vancouver Island, and the Fraser Valley east to Hope.
Food covers many cuisines (Hong Kong and Cantonese in Richmond, Japanese, Korean, Vietnamese, Punjabi, Filipino, Persian, Greek and more).

Live site: https://ruanhoo.github.io/vancouver/

## Two views

- **Classic map** (`index.html`): a Leaflet map with clustered pins, filters, favourites and a search box.
- **Living map** (`living/`): a hand-drawn canvas model of the region where little people stroll, eat and chat.
  - The **Rocky Mountaineer** (navy body, gold stripe, glass-dome cars) runs on two routes: up the Sea-to-Sky coast and east to Hope. Tap it to ride along.
  - **Seasons**: cherry blossom in spring, kayaks, paddleboards and sailboats in summer, autumn leaves, and snow with skiers on Cypress, Grouse, Seymour, Whistler and Blackcomb in winter.
  - **People** dress for the West Coast: hoodies and shorts, lululemon-style leggings, softshell jackets, daypacks and yoga mats.
  - Cypress Mountain stands between Grouse and the western range, with the five Olympic rings beside its lodge (it hosted snowboard and freestyle skiing in 2010).
  - Ferries, a seaplane, gondolas, cars, a day/night cycle, a route planner and a journal.

## Run locally

It is a static site with no build step:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/. URL options for the living map: `?season=spring|summer|autumn|winter|auto`, `?lang=en|zh`, `?tod=0..3`, `?jump=van|squamish|whistler|victoria|hope`.

## Notes

- Place details, opening hours and prices change. Treat everything as a starting point and check before you go.
- Place cards and popups show photos from Wikipedia and Wikimedia Commons, loaded live (nothing is stored in the repo): the article's lead photo first, then more large landscape photos from the same article, rotating every few seconds (paused on hover; not auto-rotating if the visitor prefers reduced motion). Each photo links to its source page. Food pins are areas, not restaurants, so they show the dish itself rather than a particular shop.
- The Rocky Mountaineer routes, stops and timing on the map are **illustrative**. Check the operator for real itineraries.
- The living map's geography is hand-drawn and stretched so that the city is roomy and the countryside is compressed. It is not to scale.
- The classic map uses OpenStreetMap tiles. No API key is needed or stored in this repo.
- Chinese translations are machine-assisted and welcome corrections.
