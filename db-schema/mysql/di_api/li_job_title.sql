CREATE TABLE `li_job_title` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `job_title_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_title` (`job_title_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21946 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
