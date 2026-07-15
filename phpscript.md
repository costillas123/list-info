# MySQL Command Reference

Install, secure, and operate MySQL for a Laravel-style app. `DROP`, `DELETE`, `TRUNCATE`, and `DROP USER` are destructive — double-check the target database before running them.

## 1. Install MySQL

```bash
sudo apt update
sudo apt install mysql-server -y

mysql --version
```

## 2. Start, stop & check the service

```bash
sudo systemctl start mysql
sudo systemctl stop mysql
sudo systemctl restart mysql
sudo systemctl status mysql
sudo systemctl enable mysql
```

## 3. Secure the installation

```bash
sudo mysql_secure_installation
```

## 4. Log in to MySQL

```bash
sudo mysql            # as root, no password prompt
mysql -u root -p      # or with a password
exit;
```

## Database commands

```sql
SHOW DATABASES;
CREATE DATABASE laravel_db;
USE laravel_db;
SELECT DATABASE();

-- destructive
DROP DATABASE laravel_db;
```

## Table commands

```sql
SHOW TABLES;
DESCRIBE users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

RENAME TABLE users TO customers;

-- destructive
DROP TABLE users;
```

## Insert data

```sql
INSERT INTO users (name, email)
VALUES ('John Doe', 'john@example.com');

INSERT INTO users (name, email)
VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
```

## Read data

```sql
SELECT * FROM users;
SELECT name, email FROM users;

SELECT * FROM users
WHERE id = 1;

SELECT * FROM users
ORDER BY name ASC;

SELECT * FROM users
LIMIT 10;
```

## Update data

```sql
UPDATE users
SET email = 'new@example.com'
WHERE id = 1;
```

## Delete data

```sql
-- destructive
DELETE FROM users
WHERE id = 1;

-- destructive: removes every row
DELETE FROM users;

-- destructive: also resets auto-increment
TRUNCATE TABLE users;
```

## User management

```sql
SELECT user, host FROM mysql.user;

CREATE USER 'laravel'@'localhost'
IDENTIFIED BY 'password123';

GRANT ALL PRIVILEGES
ON laravel_db.*
TO 'laravel'@'localhost';

FLUSH PRIVILEGES;

REVOKE ALL PRIVILEGES
ON laravel_db.*
FROM 'laravel'@'localhost';

-- destructive
DROP USER 'laravel'@'localhost';
```

## Backup & restore

```bash
mysqldump -u root -p laravel_db > backup.sql        # backup one database
mysql -u root -p laravel_db < backup.sql             # restore it
```

## Import & export

```bash
mysqldump -u root -p --all-databases > all.sql       # export everything
mysql -u root -p database_name < file.sql            # import a SQL file
```

## Useful checks

```bash
sudo systemctl status mysql
sudo systemctl restart mysql
sudo ss -tlnp | grep 3306      # confirm MySQL is listening
```

## Laravel database setup

```sql
CREATE DATABASE laravel_db;

CREATE USER 'laravel'@'localhost'
IDENTIFIED BY 'password123';

GRANT ALL PRIVILEGES
ON laravel_db.*
TO 'laravel'@'localhost';

FLUSH PRIVILEGES;
```

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_db
DB_USERNAME=laravel
DB_PASSWORD=password123
```

```bash
php artisan migrate
```
