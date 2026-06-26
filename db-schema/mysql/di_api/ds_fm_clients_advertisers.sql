CREATE TABLE `ds_fm_clients_advertisers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientId` int(10) unsigned NOT NULL,
  `clientId_fm` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `advertiserId` int(10) unsigned NOT NULL,
  `advertiserName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updateUniqueId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ds_fm_clients_advertisers_id_unique` (`clientId_fm`,`advertiserId`),
  KEY `ds_fm_clients_advertisers_clientid_index` (`clientId`),
  KEY `ds_fm_clients_advertisers_clientid_fm_index` (`clientId_fm`),
  KEY `ds_fm_clients_advertisers_advertiserid_index` (`advertiserId`),
  KEY `ds_fm_clients_advertisers_clientid_advertiserid` (`clientId`,`advertiserId`) USING BTREE,
  KEY `updateUniqueId` (`updateUniqueId`)
) ENGINE=InnoDB AUTO_INCREMENT=32962806 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
