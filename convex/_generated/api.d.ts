/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authActions from "../authActions.js";
import type * as authData from "../authData.js";
import type * as cache from "../cache.js";
import type * as flights from "../flights.js";
import type * as listsData from "../listsData.js";
import type * as providers_geocoding from "../providers/geocoding.js";
import type * as providers_images from "../providers/images.js";
import type * as providers_places from "../providers/places.js";
import type * as reviewsData from "../reviewsData.js";
import type * as tripActions from "../tripActions.js";
import type * as tripData from "../tripData.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authActions: typeof authActions;
  authData: typeof authData;
  cache: typeof cache;
  flights: typeof flights;
  listsData: typeof listsData;
  "providers/geocoding": typeof providers_geocoding;
  "providers/images": typeof providers_images;
  "providers/places": typeof providers_places;
  reviewsData: typeof reviewsData;
  tripActions: typeof tripActions;
  tripData: typeof tripData;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
