import { Router } from "express";
import {
    getAllObjects,
    getObjectLocation,
    saveObjectLocation,
    editObject,
    deleteObject,
} from "./objectController.ts";

const router = Router();

router.get("/user/:userId", getAllObjects);
router.get("/", getObjectLocation);
router.post("/", saveObjectLocation);
router.put("/:id", editObject);
router.delete("/:id", deleteObject);

export default router;
