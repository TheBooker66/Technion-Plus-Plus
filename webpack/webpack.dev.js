import { merge } from "webpack-merge";
import common from "./webpack.common.mjs";

export default merge(common, {
    watch: true,
    watchOptions: {
        ignored: "**/node_modules",
    },
    devtool: "inline-source-map",
    mode: "development",
});
