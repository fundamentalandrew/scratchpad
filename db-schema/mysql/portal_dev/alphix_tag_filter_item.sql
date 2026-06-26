CREATE TABLE `alphix_tag_filter_item` (
  `alphixIpListUuid` varchar(36) NOT NULL,
  `value` varchar(511) NOT NULL,
  `type` varchar(43) NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`alphixIpListUuid`,`value`),
  KEY `alphix_tag_filter_item_alphixIpListUuid_ip_IDX` (`alphixIpListUuid`,`value`) USING BTREE,
  KEY `alphix_tag_filter_item_alphixIpListUuid_IDX` (`alphixIpListUuid`) USING BTREE,
  KEY `alphix_tag_filter_item_value_IDX` (`value`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
