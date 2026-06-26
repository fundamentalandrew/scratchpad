CREATE TABLE `alphix_user_email_attachment_download` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `emailAttachmentUuid` varchar(36) NOT NULL,
  `downloadedOn` datetime NOT NULL,
  `userAgent` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `downloadedOn` (`downloadedOn`) USING BTREE,
  KEY `idx_email_attachment_uuid` (`emailAttachmentUuid`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4;
