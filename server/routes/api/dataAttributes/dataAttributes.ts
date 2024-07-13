import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { DataAttribute, Event } from "@server/models";
import { authorize } from "@server/policies";
import { presentDataAttribute, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "dataAttributes.info",
  auth(),
  validate(T.DataAttributesInfoSchema),
  async (ctx: APIContext<T.DataAttributesInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const dataAttribute = await DataAttribute.findByPk(id, {
      rejectOnEmpty: true,
    });

    authorize(user, "read", dataAttribute);

    ctx.body = {
      data: presentDataAttribute(dataAttribute),
    };
  }
);

router.post(
  "dataAttributes.list",
  auth(),
  validate(T.DataAttributesListSchema),
  pagination(),
  async (ctx: APIContext<T.DataAttributesListReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;

    const dataAttributes = await DataAttribute.findAll({
      where: { teamId: user.teamId },
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      data: dataAttributes.map(presentDataAttribute),
    };
  }
);

router.post(
  "dataAttributes.create",
  auth({ role: UserRole.Admin }),
  validate(T.DataAttributesCreateSchema),
  transaction(),
  async (ctx: APIContext<T.DataAttributesCreateReq>) => {
    const { name, description, dataType, options, pinned } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const dataAttribute = await DataAttribute.create(
      {
        name,
        description,
        createdById: user.id,
        teamId: user.teamId,
        dataType,
        options,
        pinned,
      },
      { transaction }
    );

    await Event.createFromContext(
      ctx,
      {
        name: "dataAttributes.create",
        modelId: dataAttribute.id,
        data: {
          name,
        },
      },
      { transaction }
    );

    ctx.body = {
      data: presentDataAttribute(dataAttribute),
      policies: presentPolicies(user, [dataAttribute]),
    };
  }
);

router.post(
  "dataAttributes.update",
  auth({ role: UserRole.Admin }),
  validate(T.DataAttributesUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.DataAttributesUpdateReq>) => {
    const { id, ...input } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const dataAttribute = await DataAttribute.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    authorize(user, "update", dataAttribute);
    dataAttribute.set(input);

    const changes = dataAttribute.changeset;
    await dataAttribute.save({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "dataAttributes.update",
        modelId: dataAttribute.id,
        changes,
      },
      { transaction }
    );

    ctx.body = {
      data: presentDataAttribute(dataAttribute),
      policies: presentPolicies(user, [dataAttribute]),
    };
  }
);

router.post(
  "dataAttributes.delete",
  auth({ role: UserRole.Admin }),
  validate(T.DataAttributesDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.DataAttributesDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const dataAttribute = await DataAttribute.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "delete", dataAttribute);
    await dataAttribute.destroy({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "dataAttributes.delete",
        modelId: dataAttribute.id,
        data: {
          name: dataAttribute.name,
        },
      },
      { transaction }
    );

    ctx.body = {
      success: true,
    };
  }
);

export default router;
