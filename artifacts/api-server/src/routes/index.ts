import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import entregasRouter from "./entregas";
import motoristasRouter from "./motoristas";
import relatoriosRouter from "./relatorios";
import notificacoesRouter from "./notificacoes";
import utilizadoresRouter from "./utilizadores";
import mapaRouter from "./mapa";
import searchRouter from "./search";
import historicoRotasRouter from "./historicoRotas";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(entregasRouter);
router.use(motoristasRouter);
router.use(relatoriosRouter);
router.use(notificacoesRouter);
router.use(utilizadoresRouter);
router.use(mapaRouter);
router.use(searchRouter);
router.use(historicoRotasRouter);

export default router;
