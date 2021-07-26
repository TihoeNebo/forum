const express = require("express");
const pars = require("body-parser");
const moder = require("./moderation.js");

console.log("Модуль moderRouter.js подключен");

const router = express.Router();
const jpars = pars.json();

router.get( '/moderate', moder.moderate);
router.get( '/reabilitate', moder.reabilitate);

router.post( '/banUser', jpars, moder.banUser);

router.delete( '/deleteUser', moder.deleteUser);

module.exports = router;