import "server-only";
import { cache } from "react";
import { readLessonBundle } from "./content-files";

// Full bundle (including references) stays on the server. Routes select public props explicitly.
export const loadLesson = cache(readLessonBundle);
