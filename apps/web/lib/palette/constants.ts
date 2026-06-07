/** Default palette result cap before "show all". */
export const MAX_RESULTS = 50;

/** Hard cap when user expands results — avoids unbounded DOM. */
export const MAX_SHOW_ALL = 200;

export const MAX_PREVIEW_RESULTS = 20;

/** Cap fuzzy matches before filter/sort — filters may narrow further. */
export const FUSE_PRE_LIMIT = 300;

export const CUSTOM_FILTER_CATEGORY_ID = "customFilter";
export const CUSTOM_FILTER_DRAFT_CATEGORY_ID = "customFilterDraft";
export const CUSTOM_FILTER_TRAIT_CATEGORY_IDS = new Set(["trait"]);

export const ARMOR_LOGIN_URL = "/api/auth/login?returnTo=%2F%3Fmode%3Darmor";
