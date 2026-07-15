# Ubuntu & Git Command Reference

Everyday shell commands, grouped by task.

## Navigation

```bash
pwd                  # Show current directory
ls                    # List files and folders
ls -l                 # Long listing
ls -la                # Show hidden files
ls -lh                # Human-readable file sizes
cd folder             # Change directory
cd ..                 # Go up one directory
cd ~                  # Go to home directory
cd /                  # Go to root directory
clear                 # Clear terminal
history               # Show command history
```

## Directory management

```bash
mkdir folder      # Create a directory
mkdir -p a/b/c     # Create nested directories
rmdir folder       # Remove an empty directory
rm -r folder       # Remove directory and contents
rm -rf folder      # Force remove directory
```

## File management

```bash
touch file.txt     # Create an empty file
nano file.txt      # Create/edit a file
vim file.txt       # Edit a file with Vim
cat file.txt       # Display file contents
less file.txt      # View file page by page
head file.txt      # First 10 lines
tail file.txt      # Last 10 lines
tail -f file.txt   # Watch file changes
```

## Copy, move & delete

```bash
cp file1 file2   # Copy file
cp -r dir1 dir2  # Copy directory
mv old new       # Move or rename
rm file.txt      # Delete file
rm -r folder     # Delete directory
```

## Search

```bash
find . -name "file.txt"   # Find a file
grep "text" file.txt      # Search text in file
grep -r "text" .          # Recursive search
```

## Permissions

```bash
chmod 755 file
chmod +x script.sh
chown user:user file
sudo chown -R ubuntu:ubuntu /var/www/task-app
```

## Users & root

```bash
whoami        # Current user
id            # User information
sudo command  # Run command as root
sudo -i       # Switch to root
exit          # Exit root
```

## Git

```bash
git clone URL
git clone URL .                    # Clone into current directory
git status
git add .
git commit -m "message"
git push
git pull
git log
git branch
git checkout branch-name
git checkout -b new-branch
```

## Package management (Ubuntu)

```bash
sudo apt update           # Update package list
sudo apt upgrade          # Upgrade packages
sudo apt install package  # Install package
sudo apt remove package   # Remove package
sudo apt autoremove       # Remove unused packages
```

## Network

```bash
ping google.com
curl https://example.com
wget URL
ip a
hostname
```

## Processes

```bash
ps
ps aux
top
htop            # if installed
kill PID
kill -9 PID       # force stop
```

## Disk & memory

```bash
df -h        # Disk usage
du -sh folder  # Folder size
free -h      # Memory usage
```

## Services (systemd)

```bash
systemctl status nginx
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl enable nginx
systemctl disable nginx
```

## Node.js / npm

```bash
node -v
npm -v
npm install
npm run dev
npm start
npm run build
```

## Compression

```bash
zip -r archive.zip folder
unzip archive.zip
tar -czf archive.tar.gz folder
tar -xzf archive.tar.gz
```

## Terminal shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl + C | Stop current command |
| Ctrl + Z | Pause current command |
| Ctrl + L | Clear terminal |
| Ctrl + R | Search command history |
| Tab | Auto-complete |
| ↑ / ↓ | Previous / next command |

## Example: deploying a Node/npm front-end

A generic workflow for a repo that builds with npm.

```bash
cd /var/www
mkdir task-app
cd task-app

git clone https://gitlab.com/username/repository.git .

ls -la

sudo chown -R ubuntu:ubuntu /var/www/task-app

npm install
npm run build

sudo systemctl restart nginx
```
