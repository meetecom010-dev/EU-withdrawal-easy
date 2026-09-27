import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

export function loginErrorMessage(loginErrors, t) {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: t("auth.login.missingShop") };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: t("auth.login.invalidShop") };
  }

  return {};
}
