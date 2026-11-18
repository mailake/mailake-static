/**
 * 解析 PNG 文件字节
 *
 * @param bytes PNG 文件字节
 *
 * @returns PNG 结构的 JSON 字符串
 */
export function png_parse(bytes: Uint8Array | number[]): string;

/**
 * 初始化 PNG 解析模块
 *
 * @returns WebAssembly 初始化结果
 */
export default function init(): Promise<unknown>;
