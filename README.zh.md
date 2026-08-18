# dsh-xray-plugin

**在 dsh 里直接问:这个插件到底能做什么。**

[English](README.md) · 简体中文

[dsh-xray](https://github.com/unStone/dsh-xray) 的配套插件。dsh-xray 静态扫描 `dsh-plugin` 标签下的每一个仓库,为每个插件发布一张能力卡片。

## 为什么需要它

dsh 插件是跑在你 Agent 运行时里的任意代码。它可以改写你的系统提示词、拦截 API 流量、起子进程、读走环境变量里的 `GITHUB_TOKEN`,或者给运行时本体打补丁——而安装路径上没有任何东西告诉你它属于哪一种。dsh 没有插件级的权限声明,所以你就算想查也无从查起。

这个插件把答案送到问题产生的地方:在 Agent 里,在你正要做决定的那一刻。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `dsh_xray_check` | 单个插件的能力卡片:注入的服务、挂载的钩子、运行时补丁、凭证类环境变量、安装期脚本,每项附 `file:line` 证据 |
| `dsh_xray_audit` | 对一组插件(比如你已经装的那些)做汇总:多少个带强能力、哪些会打补丁、哪些读凭证 |

直接用自然语言问就行:

> `tt-a1i/archify` 装了安全吗?

> 审计一下我装的这些插件。

## 能力等级

**C0** 无显著能力面 · **C1** 常规 · **C2** 强能力或敏感行为其一 · **C3** 两者并存。

等级衡量的是**能力面大小与透明度,不是恶意判定**。C3 插件完全可能是正当的——桌面外壳确实需要子进程,生态里评级最高的几个恰恰是工程质量最好的项目。真正要区分的是:一个**需要**强能力的插件,和一个**拥有**强能力却没人注意到的插件。

这不是恶意软件检测。静态分析无法判定意图,有心作恶的人可以轻松绕过。它要补的缺口是:没人知道普通插件在做什么。

## 安装

```sh
dsh plugin add https://github.com/unStone/dsh-xray-plugin/releases/download/v0.1.0/dsh-xray-plugin-0.1.0.tgz
```

Release 里带的是预构建包,安装时不会触发 pnpm 的构建脚本授权。也可以从源码装(`dsh plugin add unStone/dsh-xray-plugin`),但 pnpm 会先要求你把它加进构建白名单。

## 数据

卡片来自 [`data.json`](https://unstone.github.io/dsh-xray/data.json),由每日全生态扫描刷新,本地缓存 6 小时。**无遥测**:插件不会上报任何关于你或你环境的信息——它只是取一个静态文件,然后在本地读。

同样的数据也能在网页上看:[注册表](https://unstone.github.io/dsh-xray/registry.html?lang=zh) · [等级图解](https://unstone.github.io/dsh-xray/levels.html) · [生态报告](https://unstone.github.io/dsh-xray/report.html?lang=zh)

## 误报

每条标志都注明了来源文件和行号,所以争议是可核对的。[提 issue](https://github.com/unStone/dsh-xray/issues)——规则在公开处修正,次日扫描即生效。

## 构建

```sh
npm install
npm run build
```

Apache-2.0
