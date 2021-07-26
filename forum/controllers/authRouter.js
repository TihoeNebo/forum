const express = require("express");
const pars = require("body-parser");
const auth = require("./authentification.js");
const router = express.Router();
const jpars = pars.json();

console.log("Модуль authRouter.js подключен");

router.use(auth.checkUser, auth.deleteSelected);

router.get("/online", auth.confirmOnline);
router.get('/confirm', auth.confirmReg);
router.get('/logout',  auth.logout)

router.post("/register", jpars, auth.register);
router.post('/sendRegLetter', jpars, auth.sendLetter);
router.post('/login', jpars, auth.login);

module.exports = router;
