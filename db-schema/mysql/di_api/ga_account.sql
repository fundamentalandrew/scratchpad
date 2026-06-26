CREATE TABLE `ga_account` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_created` datetime NOT NULL,
  `google_updated` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `dcm_advertiser_id` int(11) DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'live',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_id` (`account_id`),
  KEY `name` (`name`),
  KEY `dcm_advertiser_id` (`dcm_advertiser_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1874693 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
