import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase.js";

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

function track(eventName, params = {}) {
  if (isDev) return;
  try { logEvent(analytics, eventName, params); } catch (_) {}
}

let _searchTimer = null;

export function trackPageView(tabName) {
  track("page_view", { page_title: tabName });
}

export function trackProgramView(program) {
  track("program_view", {
    program_id: program.id,
    school_name: program.school,
    state: program.state,
    conference: program.conference,
    league: program.league,
    gender: program.gender,
  });
}

export function trackSearch(query) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    if (query && query.length >= 2) {
      track("search", { search_term: query });
    }
  }, 800);
}

export function trackFilter(filterName, value) {
  if (value) track("filter_apply", { filter_name: filterName, filter_value: value });
}

export function trackExport(count) {
  track("export_csv", { row_count: count });
}

export function trackOutboundClick(url, context) {
  track("outbound_click", { url, context });
}
