# Neat Open Code (NOC) / Neutron Star Editor (NSE)

> **开发代号：Pluto (冥王星计划)**
>
> 中子星编辑器是一个稳定、中立、可长期维护的代码编辑器分支。
> 我们坚信，**工具应回归其本质，为全球所有开发者提供纯粹、可靠的服务。**

状态：停滞中



**NSE 的核心理念：**

- **稳定可靠：** 我们承诺提供可预测的、稳定的发布周期（目标为每四个月一次），并专注于安全更新与关键错误修复。
- **社区驱动：** 作为一个开源项目，我们欢迎所有秉持相同理念的开发者参与贡献，共同维护这个纯净的创作环境。





## 安装

### 先决条件
- [Git](https://git-scm.com)

### macOS

从 [NSE 发布页](https://github.com/limingjun1092/Neutron-Star-Editor/releases/latest) 下载最新的 **NSE** 版本。

### Windows

从 [NSE 发布页](https://github.com/limingjun1092/Neutron-Star-Editor/releases/latest) 下载最新的安装程序。

您也可以下载 `.zip` 压缩包版本，但此版本无法自动更新。

### Linux

NSE 目前仅适用于 64 位 Linux 系统。
（当然你可以自行移植，仅为electron差异而变化）

#### 归档文件解压方式

此方法适用于不希望以 root 权限安装 `NSE` 的用户。

1.  在 Ubuntu 上安装依赖：
    ```sh
    sudo apt install git node npm 
    ```
2.  从 [NSE 发布页](https://github.com/limingjun1092/Neutron-Star-Editor/releases/latest) 下载 `nse-amd64.tar.gz`。
3.  在您希望解压 NSE 文件夹的目录下，运行 `tar xf nse-amd64.tar.gz`。
4.  从新解压的目录中使用 `./nse` 命令启动 NSE。

Linux 版本目前不会自动更新，因此您需要在未来版本发布时重复这些步骤。

## 从源代码构建

**注意：** 本项目处于早期阶段，构建过程可能具有挑战性。

#### 先决条件
*   [Node.js](https://nodejs.org)
*   [npm](https://docs.npmjs.com/)
*   [Git](https://git-scm.com)


#### 步骤
1.  克隆仓库：
    ```sh
    git clone https://github.com/limingjun1092/Neutron-Star-Editor.git
    cd Neutron-Star-Editor
    ```
2.  使用NPM对NSE安装依赖：
    ```sh
    npm install
    ```
3.  启动编辑器：
    ```sh
    npm start
    ```

## 路线图与发布周期

NSE (Pluto 版本) 致力于提供一个稳定的维护分支。我们的核心目标是：
- **现代化维护：** 逐步、谨慎地更新关键依赖，以解决安全问题和兼容性。
- **稳健更新：** 目标发布周期为 **每四个月一次**，主要包含错误修复、安全补丁和有限的、经过充分测试的改进。
- **透明沟通：** 所有重大变更和发布计划都将在 [GitHub Discussions](https://github.com/limingjun1092/Neutron-Star-Editor/discussions) 中公开讨论。

## 讨论与贡献

本项目由个人开发者 [@limingjun1092](https://github.com/limingjun1092) 发起并主导，但热烈欢迎社区的参与。
- **讨论：** 在 [GitHub Discussions](https://github.com/limingjun1092/Neutron-Star-Editor/discussions) 中与我们交流。
- **贡献：** 我们欢迎错误报告、功能请求和拉取请求。请确保您的贡献符合项目的**中立与稳定**核心理念。

## 许可证

[MIT](https://github.com/limingjun1092/Neutron-Star-Editor/blob/master/LICENSE)

---

**Neat Open Code. Neutron Star Editor.**