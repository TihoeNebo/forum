const express = require("express");
const router = express.Router();

console.log("Модуль static.js подключен");

router.use("/script.js", express.static( __dirname +"/../script.js"));
router.use("/regList.js", express.static( __dirname +"/../regList.js"));
router.use("/optionsList.js", express.static(  __dirname +"/../optionsList.js"));
router.use("/style.css", express.static( __dirname +"/../style.css"));
router.use("/reset.css", express.static( __dirname +"/../reset.css"));
router.use("/favicon.ico", express.static( __dirname +"/../favicon.ico"));

module.exports = router;