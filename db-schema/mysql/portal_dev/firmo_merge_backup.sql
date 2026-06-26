CREATE TABLE `firmo_merge_backup` (
  `uuid` varchar(36) NOT NULL,
  `merge_batch_id` varchar(36) NOT NULL,
  `source_table` varchar(100) NOT NULL,
  `original_uuid` varchar(36) NOT NULL,
  `role` enum('parent','child') NOT NULL,
  `record_snapshot` json NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `merge_batch_id` (`merge_batch_id`),
  KEY `source_table` (`source_table`,`original_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
