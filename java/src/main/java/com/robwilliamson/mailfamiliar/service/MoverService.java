package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.FolderRecordMissingException;
import com.robwilliamson.mailfamiliar.service.move.Mover;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.concurrent.locks.*;

@RequiredArgsConstructor
@Log4j2
@Service
public class MoverService implements Runnable {
  private final Lock lock = new ReentrantLock();
  private final Condition moveAdded = lock.newCondition();
  private final Mover mover;
  private final TaskExecutor taskExecutor;

  @PostConstruct
  void init() {
    taskExecutor.execute(this);
  }

  public void move(Message message, Mailbox to) throws
      FolderRecordMissingException,
      InterruptedException {
    lock.lock();
    try {
      mover.handleMoveState(mover.saveMove(message, to));
    } finally {
      moveAdded.signal();
      lock.unlock();
    }
  }

  @Override
  public void run() {
    while (true) {
      try {
        while (mover.checkForMoves()) {
          //noinspection BusyWait
          Thread.sleep(0);
        }

        lock.lock();
        moveAdded.await();
      } catch (InterruptedException e) {
        return;
      } finally {
        lock.unlock();
      }
    }
  }
}
