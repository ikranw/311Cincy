# 311Cincy
An interactive data visualization exploring Cincinnati's 311 non-emergency service requests. Developed by Faith, Fareena, Kelly, and Ikran to help residents and researchers understand how, where, and when city services are being requested.

Live link: https://ikranw.github.io/311Cincy/

---

## Motivation

<!-- write here -->

---

## Data

<!-- write here -->

---

## Sketches

Before writing any code, we sketched out what we wanted the dashboard to look like. Our main goal was to keep the map and the supporting charts on screen at the same time since they were all linked interactions, so a two-column layout made the most sense for the time we had. The left side holds the map and timeline, and the right side has five smaller charts.

**Overall dashboard layout:**

<img src="assets/dashboard-sketch.png" width="300"/>

This was our first sketch and it stayed pretty close to what we actually built. We knew the proportions would shift once we had real data in it.

**Map view:**

<img src="assets/map-sketch.png" width="300"/>

The map was the first thing we designed around since it drives most of the geographic context. We knew we wanted some way to show density across the city, which led to the heatmap toggle. Individual points let you see specific requests, while the heatmap gives a better sense of where flooding clusters.

**Timeline:**

<img src="assets/timeline-sketch.png" width="300"/>

We debated between a line chart and a bar chart for the timeline. Since we were grouping requests by week, bars felt more honest since each bar represents a discrete count for that week. We realized how useful the date brush filter was in order to select a time range and have the map update to only show requests from that period.

---

## Visualization Components

<!-- write here -->

---

## What You Can Discover

<!-- write here -->

---

## Process

We used D3.js (v6) for all the charts (timeline, bar charts, pie chart). The map is built with Leaflet, and we used the leaflet-heat plugin for the heatmap layer. Everything else is plain HTML, CSS, and JavaScript with no framework.

The code is split into separate JS files by component: `leafletMap.js` handles the map, `timeline.js` handles the time chart, and files like `neighborhood.js`, `serviceType.js`, `method.js`, etc. each handle their own chart. `main.js` loads the data and ties everything together.

To run it locally: 
- Clone the repo and run `python3 -m http.server 8000` in the project folder
- Open `localhost:8000` in your browser.


---

## Challenges and Future Work

One of the hardest parts was probably getting all the views to update together when you change a filter. D3 data joins were tricky to get right, especially making sure old elements got removed cleanly instead of stacking on top of each other. The timeline brush interaction also took a while to wire up so that selecting a date range actually filtered the map and other charts correctly.

We also ran into some issues with the filtering pipeline. At one point, layering multiple filters together broke the dataset state and had to roll back locally and start that part over from scratch. It was a good lesson in being careful about how filtered data gets passed between components. We also had to make sure the service type filter propagated to all the charts, not just the map, which took some extra debugging to get right.

Merge conflicts was another concern since the four of us were working on overlapping parts of the codebase at different times. But we communicated our progress regularly so we ran into less conflicts when pushing changes.

If we had more time we would add a time-range slider so you could scrub through dates more smoothly, and show average response time by neighborhood. We might also look into more innovative ways to display all this data. A mobile friendly layout would also help since the dashboard is pretty packed right now.

---

## AI and Collaboration

<!-- write here -->

---

## Who Did What

<!-- write here -->

---

## Demo Video

<!-- write here -->
