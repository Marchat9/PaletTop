/**
 * Query parameter of the configuration page asking to bring the parameters specific to the mode
 * (the brackets) into view. In a file of its own so that the admin page can build the link without
 * importing the page, which the routes load lazily.
 */
export const CONFIGURATION_SECTION_QUERY_PARAM = 'section';
export const CONFIGURATION_MODE_SECTION = 'mode';
