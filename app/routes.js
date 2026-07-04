import { flatRoutes } from "@react-router/fs-routes";
import { route } from "@react-router/dev/routes";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Every file dropped in app/routes/api/ is auto-registered at /api/<filename>,
// e.g. app/routes/api/shop.jsx -> GET/PUT/PATCH/DELETE /api/shop.
// flat-routes' own folder convention doesn't support a plain shared folder
// like this (it only nests via dot-prefixed folders), so these routes are
// wired up by hand here instead.
const apiDir = fileURLToPath(new URL("./routes/api", import.meta.url));
const apiRoutes = readdirSync(apiDir)
  .filter((file) => /\.jsx?$/.test(file))
  .map((file) => {
    const name = file.replace(/\.jsx?$/, "");
    return route(`api/${name}`, `routes/api/${file}`);
  });

export default [
  ...(await flatRoutes({ ignoredRouteFiles: ["api/**"] })),
  ...apiRoutes,
];
