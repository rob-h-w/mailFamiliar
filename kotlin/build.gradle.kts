import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.springframework.boot") version "2.5.2"
    id("io.spring.dependency-management") version "1.0.11.RELEASE"
    kotlin("jvm") version "1.5.20"
    kotlin("plugin.spring") version "1.5.20"
    id("org.flywaydb.flyway") version "7.11.0"
    id("nu.studer.jooq") version "5.2.1"
    jacoco
}

group = "com.robwilliamson"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_11

val driver = "org.sqlite.JDBC"
val jooqDbName = "jooq.db"
val jooqDbUrl = "jdbc:sqlite:${projectDir}/${jooqDbName}"
val password = "some_secret"
val user = "some_user"
val jacocoVersion = "0.8.7"

repositories {
    mavenCentral()
}

extra["testcontainersVersion"] = "1.15.3"

dependencies {
    compileOnly("org.jooq:jooq-codegen")

    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-quartz")
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.flywaydb:flyway-core")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.xerial:sqlite-jdbc")
    implementation("org.webjars:bootstrap:4.4.1-1")
    implementation("org.webjars:jquery:3.5.1")
    implementation("org.webjars:webjars-locator-core")

    jooqGenerator("org.xerial:sqlite-jdbc")

    testImplementation("org.flywaydb.flyway-test-extensions:flyway-spring-test:7.0.0")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.springframework.security:spring-security-test")
}

dependencyManagement {
    imports {
        mavenBom("org.testcontainers:testcontainers-bom:${property("testcontainersVersion")}")
    }
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = "11"
    }
}

jacoco {
    toolVersion = jacocoVersion
    version = jacocoVersion
}

val jacocoTestReport = tasks.named("jacocoTestReport")
val excludeList = listOf(
    "**/jooq/**",
    "**/MailfamiliarApplicationKt.class"
)

val test by tasks.getting(Test::class) {
    configure<JacocoTaskExtension> {
        isEnabled = true
        excludes
    }
    finalizedBy(jacocoTestReport)
    useJUnitPlatform { }
}

tasks.withType(JacocoReport::class.java).all {
    classDirectories.setFrom(
        sourceSets.main.get().output.asFileTree.matching {
            exclude(excludeList)
        }
    )

    reports {
        html.isEnabled = true
        html.destination = File("$buildDir/reports/jacoco/report.html")
        xml.isEnabled = true
        xml.destination = File("$buildDir/reports/jacoco/report.xml")
    }
}

tasks.withType(JacocoCoverageVerification::class.java).all {
    afterEvaluate {
        classDirectories.setFrom(files(classDirectories.files.map {
            fileTree(it).apply {
                exclude(excludeList)
            }
        }))
    }
    dependsOn(jacocoTestReport)
    violationRules {
        rule {
            limit {
                minimum = BigDecimal("0.8")
            }
        }
    }
}

flyway {
    driver
    password
    url = jooqDbUrl
    user
}

jooq {
    configurations {
        create("main") {  // name of the jOOQ configuration

            jooqConfiguration.apply {
                logging = org.jooq.meta.jaxb.Logging.WARN
                jdbc = jdbc.apply {
                    driver = driver
                    password = password
                    url = jooqDbUrl
                    user = user
                }
                generator.apply {
                    name = "org.jooq.codegen.DefaultGenerator"
                    generate.apply {
                        isDeprecated = false
                        isRecords = true
                        isImmutablePojos = false
                        isFluentSetters = true
                    }
                    target.apply {
                        packageName = "com.robwilliamson.jooq"
                        directory = "build/generated-src/jooq/main"  // default (can be omitted)
                    }
                    strategy.name = "org.jooq.codegen.DefaultGeneratorStrategy"
                }
            }
        }
    }
}

tasks.named<nu.studer.gradle.jooq.JooqGenerate>("generateJooq") {
    allInputsDeclared.set(true)
    dependsOn("flywayMigrate")
}
