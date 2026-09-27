import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { login } from "../../shopify.server";
import { getRequestT } from "../../i18n/server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request), getRequestT(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request), getRequestT(request));

  return {
    errors,
  };
};

export default function Auth() {
  const { t } = useTranslation();
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
          <s-section heading={t("auth.login.heading")}>
            <s-text-field
              name="shop"
              label={t("auth.login.shopLabel")}
              details={t("auth.login.shopDetails")}
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            ></s-text-field>
            <s-button type="submit">{t("auth.login.submit")}</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
