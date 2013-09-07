bin/mysqldump -d > db.sql
tar czf `date +%F`.tgz bin conf lib script t tmpl data/js data/css data/*.html data/*.xml data/img/*.* data/img/admin db.sql