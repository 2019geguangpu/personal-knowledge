import { tool, zodSchema } from "ai";
import { z } from "zod";
import { executeSortListByStat } from "@/lib/sort-list-by-stat.logic";

export const sortListByStatTool = tool({
  description: [
    "对 JSON 中的一条「对象数组」按某项属性的数值排序。",
    "典型数据：每项含「属性」数组，元素含「类型」「数值」（数值常为带 % 的字符串）。",
    "你必须根据用户自然语言自行决定 compare_stat_label，使其能与「类型」字段做子串匹配（例如用户说按全流排序，可传「全流强度」）。",
    "payload_json 可为整段识别结果或仅含列表的对象；若存在多个数组，可用 list_path_hint 指定键名（如 铭文列表）。",
  ].join(""),
  inputSchema: zodSchema(
    z.object({
      payload_json: z
        .string()
        .min(1)
        .describe("待排序结构的 JSON 字符串（中文键名可保留）"),
      compare_stat_label: z
        .string()
        .min(1)
        .describe(
          "用于比较的「属性.类型」标签：由你根据用户问题自行选择，勿写死为固定属性",
        ),
      list_path_hint: z
        .string()
        .optional()
        .describe("对象中列表字段的键名提示，如 铭文列表；不确定可省略"),
      order: z
        .enum(["asc", "desc"])
        .describe("asc 从小到大，desc 从大到小"),
    }),
  ),
  execute: async (input) => executeSortListByStat(input),
});
