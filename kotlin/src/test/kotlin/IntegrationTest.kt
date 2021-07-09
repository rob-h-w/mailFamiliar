import org.flywaydb.test.FlywayTestExecutionListener
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestExecutionListeners
import org.springframework.test.context.TestPropertySource
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener


@ActiveProfiles("test")
@Retention
@SpringBootTest
@TestExecutionListeners(
    DependencyInjectionTestExecutionListener::class,
    FlywayTestExecutionListener::class
)
@TestPropertySource(
    properties = arrayOf(
        "MAIL_FAMILIAR_KEY=testkey"
    )
)
annotation class IntegrationTest
