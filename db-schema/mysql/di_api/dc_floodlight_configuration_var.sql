CREATE TABLE `dc_floodlight_configuration_var` (
  `floodlightConfigurationId` int(11) NOT NULL,
  `variableType` varchar(10) NOT NULL,
  `dataType` varchar(20) NOT NULL,
  `reportName` varchar(50) NOT NULL,
  PRIMARY KEY (`floodlightConfigurationId`,`variableType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
