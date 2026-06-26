CREATE TABLE `psychographix_campaigns` (
  `campaign_uuid` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `journey_type` varchar(50) NOT NULL DEFAULT 'product-led',
  `config` json NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `market` varchar(50) DEFAULT NULL,
  `scope` varchar(50) NOT NULL DEFAULT 'private',
  `client_uuid` varchar(36) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  PRIMARY KEY (`campaign_uuid`),
  KEY `idx_owner_client` (`created_by`,`client_uuid`),
  KEY `idx_client_scope` (`client_uuid`,`scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
