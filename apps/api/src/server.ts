import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, "127.0.0.1", () => {
  console.log(`DealHunter API listening at http://127.0.0.1:${port}`);
});
