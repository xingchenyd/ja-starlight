# 星光计划自托管运维

## 部署约定

- 域名：`star-plan.com`，`www.star-plan.com` 重定向到主域名。
- 当前主机：腾讯云轻量应用服务器 `81.71.71.252`，Ubuntu 24.04。
- 应用：`/srv/star-plan/current` 指向一个不可变版本目录；Node 仅监听 `127.0.0.1:3000`。
- 数据：`/srv/star-plan/data/app.sqlite` 与 `files/`；不要放进静态资源目录或 Git。
- 密钥：`/etc/star-plan/runtime.json`，root:star-plan、640。AUTH_PEPPER 必须与原库匹配，不可重新生成。
- 文件私有权限由接口校验；Nginx 不直接公开数据目录。
- 生产环境禁止测试身份绕过；平台后台仍需要原管理员密钥。

## 域名与 HTTPS 尚待执行

DNSPod 的 `@` 和 `www` 添加 A 记录指向服务器，线路默认，TTL 默认。保留已有 MX/TXT 记录，同名冲突先核对，不直接删除。

官方说明：https://docs.dnspod.cn/dns/help-a/

正式切换前再次核对旧站自导出快照后的新增业务数据和文件；有差异则先完成最终同步。当前导入不是双向同步系统。旧站此后仍可产生新数据，不能让两个站长期各自接收提交。

确认公共 DNS 和 80/443 防火墙后，使用已安装的 Certbot：

```sh
sudo certbot certonly --webroot -w /var/www/star-plan-acme \
  -d star-plan.com -d www.star-plan.com \
  --email ruthyanghao@hotmail.com --agree-tos --non-interactive
```

证书成功签发后才安装 `deploy/nginx-https.conf` 到 `/etc/nginx/sites-available/star-plan`，执行 `sudo nginx -t`，通过后 reload。当前 HTTP 配置仅开放 ACME 挑战，其余显示维护页，不提供明文登录。

验收证书主机名、有效期、完整链、HTTP/www 重定向、三端实际浏览器登录、私有简历下载及备案页脚，并执行 `sudo certbot renew --dry-run`。证书续期应配置成功后 reload Nginx 的 deploy hook；仅有 certbot.timer 不等于完成全链路续期验收。

## 日常检查

```sh
systemctl is-active star-plan
sudo journalctl -u star-plan -n 30 --no-pager
sudo systemctl list-timers star-plan-backup.timer
sudo journalctl -u star-plan-backup -n 20 --no-pager
df -h /srv/star-plan
```

生产登录自检不会新增活动或报名，只生成正常会话和审计记录，并主动退出：

```sh
cd /srv/star-plan/current
sudo -u star-plan /opt/node-v24.20.0-linux-x64/bin/node \
  scripts/smoke-server.mjs /srv/star-plan/data /etc/star-plan/runtime.json
```

`scripts/acceptance-http.mjs` 会写入验收活动和报名，**仅允许对独立副本使用，不得对正式数据库使用**。

## 备份与恢复

每日北京时间 03:30 加至多 5 分钟随机延迟执行备份。手动备份：

```sh
sudo systemctl start star-plan-backup.service
```

快照位于 `/srv/star-plan/snapshots/<时间戳>/`。脚本使用 SQLite 在线备份，包含文件、元数据、运行密钥，校验成功才写 `backup-complete.json`。不要把未完成目录当作可恢复备份。备份目录含敏感数据，不能公开。

空间预检查要求可用空间不少于数据/配置大小两倍加 2 GiB；不足则失败并记录日志，保留历史备份，不自动删除。**仍需定期检查磁盘并制定保留和异地备份策略；目前没有自动告警、自动清理或持续异地复制。** 单机磁盘损坏无法靠同盘快照恢复；本次原始加密导出另在本地电脑保存了一份。

恢复时先检查完成标记及文件校验；复制到新的私有恢复目录，使用独立端口启动并验收。确认后进入维护窗口，停止正式进程并保留当前库及其 WAL，再切换数据目录。不要覆盖运行中的 SQLite 文件，不要直接在唯一备份上启动应用。

版本回退只切换代码软链接；如果已发生数据库迁移，必须先核对向后兼容性，不得只回退代码后假设数据兼容。

## 暂缓事项

- Resend/Tencent Cloud 邮件发送仍未配置；忘记密码界面保留明确的未开通提示。
- 公安备案未完成，不展示用户提供的非备案号字符串。
- 未更换密码或管理员密钥；完成正式访问验收后建议由账号持有人轮换曾用于演示的凭据。
