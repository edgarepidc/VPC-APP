import { cache } from "react";

import { getPmoSnapshot } from "./service";

/** Dedupe snapshot fetch within the same request (layout + page). */
export const getCachedPmoSnapshot = cache(getPmoSnapshot);
