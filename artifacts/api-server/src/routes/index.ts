import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import adminRouter from "./admin";
import modulesRouter from "./modules";
import viaRouter from "./via";

const router: IRouter = Router();

router.use(healthRouter);
router.use(viaRouter);
router.use(publicRouter);
router.use(adminRouter);
router.use(modulesRouter);

export default router;
