import express from "express";
import {
    CreateCharge,
} from "./payment.controller.js";

const router = express.Router();

router.post("/create-charge", CreateCharge);

export default router;

