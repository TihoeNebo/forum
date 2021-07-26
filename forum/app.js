const express = require("express");
const exphbs = require("express-handlebars");
const hbs= require("hbs");
const cookiePars = require("cookie-parser");

const authRouter = require("./controllers/authRouter.js");
const moderRouter = require("./controllers/moderRouter.js");
const userSSE = require("./controllers/userSSE.js");
const meRouter = require("./controllers/profileAPI.js");
const GETrouter = require("./controllers/forumGET.js");
const POSTrouter = require("./controllers/forumPOST.js");
const PUTrouter = require("./controllers/forumPUT.js");
const DELETErouter = require("./controllers/forumDELETE.js");
const staticRouter = require("./controllers/static.js");

const helpers = require("./models/helpers.js");
require("./database/createRoot.js");

const app = express();

app.engine("hbs", exphbs(helpers) );
app.set("view engine", "hbs");
hbs.registerPartials(__dirname + "/views/partials");

app.use( staticRouter);

app.use(cookiePars());

app.get("/pulse", userSSE.pulse)
app.use(authRouter);
app.use(moderRouter);
app.use("/me", meRouter);

app.use(GETrouter);
app.use(POSTrouter);
app.use(PUTrouter);
app.use(DELETErouter);

app.listen(3000);